package com.chesstutor.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Liveness for the container runtime and whatever watches the deployment. Deliberately outside
 * {@code /api/} so the rate limiter leaves it alone — a health check that gets throttled reports a
 * busy service as a dead one.
 *
 * It says nothing about Stockfish or the LLM on purpose: restarting the container would not fix
 * either, so failing here on their account would trade a degraded service for no service.
 */
@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
