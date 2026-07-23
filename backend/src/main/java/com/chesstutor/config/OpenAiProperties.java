package com.chesstutor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "chessko.openai")
public class OpenAiProperties {

    /** OpenAI API key used for both embeddings and chat completions. */
    private String apiKey;

    /** Base URL for the OpenAI-compatible API. */
    private String baseUrl = "https://api.openai.com/v1";

    /** Embedding model used to vectorize search queries against the opening-principle store. */
    private String embeddingModel = "text-embedding-3-small";

    /**
     * Requested embedding dimensionality. 0 means "don't ask" — the model's native size. Gemini's
     * embedding is natively 3072, which exceeds pgvector's ivfflat index limit (2000) and the
     * store's {@code vector(1536)} column; it supports Matryoshka truncation, so setting this to
     * 1536 makes its output drop straight into the existing schema. OpenAI's 1536-native models
     * don't need it. The seeder and the query path both read this, so stored and query vectors
     * always share a dimension.
     */
    private int embeddingDimensions = 0;

    /** Chat model used to generate the beginner-friendly explanation. */
    private String chatModel = "gpt-4o-mini";

    /** How long a single OpenAI HTTP call may take before failing fast. */
    private long timeoutMs = 8000;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getEmbeddingModel() {
        return embeddingModel;
    }

    public void setEmbeddingModel(String embeddingModel) {
        this.embeddingModel = embeddingModel;
    }

    public int getEmbeddingDimensions() {
        return embeddingDimensions;
    }

    public void setEmbeddingDimensions(int embeddingDimensions) {
        this.embeddingDimensions = embeddingDimensions;
    }

    public String getChatModel() {
        return chatModel;
    }

    public void setChatModel(String chatModel) {
        this.chatModel = chatModel;
    }

    public long getTimeoutMs() {
        return timeoutMs;
    }

    public void setTimeoutMs(long timeoutMs) {
        this.timeoutMs = timeoutMs;
    }
}
