package com.chesstutor.web;

import com.chesstutor.config.RateLimitProperties;
import com.chesstutor.exception.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * A token bucket per client address, refilled continuously.
 *
 * In memory on purpose: one instance serves this app, and a limiter that needs its own datastore to
 * start is a limiter that gets switched off. If the API is ever run on more than one node this has
 * to move to something shared — until then, per-process state costs nothing and is one fewer thing
 * that can be misconfigured.
 *
 * Registered by {@link RateLimitConfig} rather than by annotation, which keeps it out of
 * {@code @WebMvcTest} slices: a controller test asserting on responses should not be counting
 * requests against a budget.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    /** Idle buckets are dropped after this long so the map tracks live clients, not every visitor. */
    private static final Duration BUCKET_TTL = Duration.ofMinutes(10);
    private static final int MAX_TRACKED_CLIENTS = 10_000;

    private final RateLimitProperties properties;
    private final ObjectMapper objectMapper;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Health checks come from the container runtime on every interval; they must never be
        // throttled, or a busy minute would report the service as down.
        return !properties.isEnabled() || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String client = clientOf(request);
        int cost = costOf(request.getRequestURI());

        if (!bucketFor(client).tryConsume(cost, properties.getTokensPerMinute())) {
            reject(response);
            return;
        }
        chain.doFilter(request, response);
    }

    private int costOf(String uri) {
        if (uri.endsWith("/analysis/commentary")) {
            return properties.getCommentaryCost();
        }
        if (uri.endsWith("/analysis/game")) {
            return properties.getGameCost();
        }
        return properties.getDefaultCost();
    }

    private String clientOf(HttpServletRequest request) {
        if (properties.isTrustForwardedFor()) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                // Left-most entry is the original client; the rest are proxies that appended themselves.
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private Bucket bucketFor(String client) {
        // A flood from many addresses would otherwise grow the map without bound. Dropping everything
        // and starting over is crude, but it bounds memory and only costs the current clients one
        // refilled bucket.
        if (buckets.size() > MAX_TRACKED_CLIENTS) {
            buckets.entrySet().removeIf(entry -> entry.getValue().isIdle());
            if (buckets.size() > MAX_TRACKED_CLIENTS) {
                buckets.clear();
            }
        }
        return buckets.computeIfAbsent(client, key -> new Bucket(properties.getTokensPerMinute()));
    }

    private void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", "60");
        objectMapper.writeValue(
                response.getWriter(),
                new ErrorResponse("요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요."));
    }

    private static final class Bucket {

        private double tokens;
        private long lastRefillNanos;

        private Bucket(int capacity) {
            this.tokens = capacity;
            this.lastRefillNanos = System.nanoTime();
        }

        private synchronized boolean tryConsume(int cost, int perMinute) {
            long now = System.nanoTime();
            double refilled = (now - lastRefillNanos) / 60_000_000_000.0 * perMinute;
            lastRefillNanos = now;
            tokens = Math.min(perMinute, tokens + refilled);

            if (tokens < cost) {
                return false;
            }
            tokens -= cost;
            return true;
        }

        private synchronized boolean isIdle() {
            return System.nanoTime() - lastRefillNanos > BUCKET_TTL.toNanos();
        }
    }
}
