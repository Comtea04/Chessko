package com.chesstutor.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.chesstutor.config.RateLimitProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RateLimitFilterTest {

    private RateLimitProperties properties;
    private RateLimitFilter filter;

    @BeforeEach
    void setUp() {
        properties = new RateLimitProperties();
        properties.setTokensPerMinute(10);
        properties.setDefaultCost(1);
        properties.setCommentaryCost(5);
        properties.setGameCost(5);
        filter = new RateLimitFilter(properties, new ObjectMapper());
    }

    private MockHttpServletResponse call(String uri, String clientIp) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.addHeader("X-Forwarded-For", clientIp);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    void allowsTrafficUpToTheBudgetThenRejects() throws Exception {
        for (int i = 0; i < 10; i++) {
            assertThat(call("/api/v1/analysis", "1.1.1.1").getStatus()).isEqualTo(200);
        }
        assertThat(call("/api/v1/analysis", "1.1.1.1").getStatus()).isEqualTo(429);
    }

    @Test
    void chargesTheLlmEndpointMoreThanAPlainAnalysis() throws Exception {
        // Two commentary calls cost the whole budget, where ten analyses would have fit.
        assertThat(call("/api/v1/analysis/commentary", "2.2.2.2").getStatus()).isEqualTo(200);
        assertThat(call("/api/v1/analysis/commentary", "2.2.2.2").getStatus()).isEqualTo(200);
        assertThat(call("/api/v1/analysis/commentary", "2.2.2.2").getStatus()).isEqualTo(429);
    }

    @Test
    void budgetsAreSeparatePerClient() throws Exception {
        for (int i = 0; i < 10; i++) {
            call("/api/v1/analysis", "3.3.3.3");
        }
        assertThat(call("/api/v1/analysis", "3.3.3.3").getStatus()).isEqualTo(429);
        assertThat(call("/api/v1/analysis", "4.4.4.4").getStatus()).isEqualTo(200);
    }

    @Test
    void explainsTheRejectionInKoreanRatherThanAnEmptyBody() throws Exception {
        for (int i = 0; i < 10; i++) {
            call("/api/v1/analysis", "5.5.5.5");
        }
        MockHttpServletResponse response = call("/api/v1/analysis", "5.5.5.5");

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
        assertThat(response.getContentAsString()).contains("요청이 너무 잦습니다");
    }

    @Test
    void healthChecksAreNeverThrottled() throws Exception {
        for (int i = 0; i < 50; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            assertThat(response.getStatus()).isEqualTo(200);
        }
    }

    @Test
    void ignoresTheForwardedHeaderWhenItIsNotTrusted() throws Exception {
        // With no proxy in front, a client could otherwise mint a fresh identity per request.
        properties.setTrustForwardedFor(false);
        for (int i = 0; i < 10; i++) {
            call("/api/v1/analysis", "6.6.6." + i);
        }
        assertThat(call("/api/v1/analysis", "6.6.6.99").getStatus()).isEqualTo(429);
    }

    @Test
    void refillsOverTime() throws Exception {
        properties.setTokensPerMinute(600); // 10/sec, so ~100ms buys one request back

        // Drain by request rather than by count: the bucket refills while the loop runs, so the
        // number of calls it takes to empty it is not a fixed number.
        int guard = 0;
        while (call("/api/v1/analysis", "7.7.7.7").getStatus() == 200 && guard++ < 5_000) {
            // keep spending
        }
        assertThat(guard).isLessThan(5_000);
        assertThat(call("/api/v1/analysis", "7.7.7.7").getStatus()).isEqualTo(429);

        Thread.sleep(250);
        assertThat(call("/api/v1/analysis", "7.7.7.7").getStatus()).isEqualTo(200);
    }
}
