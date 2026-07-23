package com.chesstutor.service;

import com.chesstutor.config.OpenAiProperties;
import com.chesstutor.exception.CommentaryUnavailableException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin wrapper around the OpenAI HTTP API: embeddings (to vectorize the RAG search query) and
 * chat completions (to write the final beginner-friendly explanation). Kept as a single small
 * client, mirroring how {@link StockfishEngine} isolates all raw process I/O behind a narrow
 * interface for {@link StockfishService}.
 */
@Component
public class OpenAiClient {

    private final OpenAiProperties properties;
    private final RestClient restClient;

    public OpenAiClient(OpenAiProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.getTimeoutMs());
        requestFactory.setReadTimeout((int) properties.getTimeoutMs());
        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public float[] embed(String input) {
        try {
            Map<String, Object> body = new java.util.HashMap<>();
            body.put("model", properties.getEmbeddingModel());
            body.put("input", input);
            // Only pin a size when configured — see OpenAiProperties#embeddingDimensions. Sending it
            // to a model that doesn't offer the param would be an error, so 0 omits it entirely.
            if (properties.getEmbeddingDimensions() > 0) {
                body.put("dimensions", properties.getEmbeddingDimensions());
            }
            EmbeddingResponse response = restClient.post()
                    .uri("/embeddings")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey())
                    .body(body)
                    .retrieve()
                    .body(EmbeddingResponse.class);
            if (response == null || response.data() == null || response.data().isEmpty()) {
                throw new CommentaryUnavailableException("임베딩 응답이 비어 있습니다.");
            }
            List<Double> vector = response.data().get(0).embedding();
            float[] result = new float[vector.size()];
            for (int i = 0; i < vector.size(); i++) {
                result[i] = vector.get(i).floatValue();
            }
            return result;
        } catch (RestClientException e) {
            throw new CommentaryUnavailableException("임베딩 생성 중 오류가 발생했습니다.", e);
        }
    }

    public String chat(String systemPrompt, String userPrompt) {
        try {
            ChatResponse response = restClient.post()
                    .uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getApiKey())
                    .body(Map.of(
                            "model", properties.getChatModel(),
                            "temperature", 0.4,
                            "messages", List.of(
                                    Map.of("role", "system", "content", systemPrompt),
                                    Map.of("role", "user", "content", userPrompt)
                            )
                    ))
                    .retrieve()
                    .body(ChatResponse.class);
            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                throw new CommentaryUnavailableException("해설 응답이 비어 있습니다.");
            }
            return response.choices().get(0).message().content().trim();
        } catch (RestClientException e) {
            throw new CommentaryUnavailableException("해설 생성 중 오류가 발생했습니다.", e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EmbeddingResponse(List<EmbeddingData> data) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record EmbeddingData(List<Double> embedding) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatResponse(List<ChatChoice> choices) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatChoice(ChatMessage message) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ChatMessage(String content) {
    }
}
