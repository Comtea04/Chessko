package com.chesstutor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Connection settings for the Supabase project used purely as a pgvector store for chess opening
 * theory/principle text. This is a separate database from the relational PostgreSQL instance
 * that will later hold user/payment data.
 */
@ConfigurationProperties(prefix = "chessko.vectorstore")
public class VectorStoreProperties {

    /** Supabase project URL, e.g. https://xxxxx.supabase.co */
    private String url;

    /** Supabase service-role (or restricted) API key sent as apikey/Authorization headers. */
    private String serviceKey;

    /** Name of the Postgres RPC function exposed via PostgREST that performs the similarity search. */
    private String matchFunction = "match_opening_principles";

    /** How many opening principles to retrieve per query. */
    private int matchCount = 3;

    /** How long a single Supabase HTTP call may take before failing fast. */
    private long timeoutMs = 5000;

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getServiceKey() {
        return serviceKey;
    }

    public void setServiceKey(String serviceKey) {
        this.serviceKey = serviceKey;
    }

    public String getMatchFunction() {
        return matchFunction;
    }

    public void setMatchFunction(String matchFunction) {
        this.matchFunction = matchFunction;
    }

    public int getMatchCount() {
        return matchCount;
    }

    public void setMatchCount(int matchCount) {
        this.matchCount = matchCount;
    }

    public long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
