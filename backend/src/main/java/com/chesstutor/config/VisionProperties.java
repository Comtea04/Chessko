package com.chesstutor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chessko.vision")
public class VisionProperties {

    /** Base URL of the Python Vision microservice (see vision/README.md). */
    private String baseUrl = "http://localhost:8000";

    /** How long a single call to the Vision microservice may take before failing fast. */
    private long timeoutMs = 10000;

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
