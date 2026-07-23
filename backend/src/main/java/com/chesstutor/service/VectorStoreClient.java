package com.chesstutor.service;

import com.chesstutor.config.VectorStoreProperties;
import com.chesstutor.domain.OpeningPrinciple;
import com.chesstutor.exception.CommentaryUnavailableException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Queries the Supabase pgvector store for opening theory/principle text closest to a given
 * embedding. Supabase is used here purely as a PostgREST-fronted vector index, called over HTTP
 * via the {@code match_opening_principles} RPC function (see
 * {@code db/supabase_setup.sql}) — separate from the relational PostgreSQL database that will
 * later hold user/payment data.
 */
@Component
public class VectorStoreClient {

    private static final Logger log = LoggerFactory.getLogger(VectorStoreClient.class);

    private final VectorStoreProperties properties;
    private final RestClient restClient;

    public VectorStoreClient(VectorStoreProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.getTimeoutMs());
        requestFactory.setReadTimeout((int) properties.getTimeoutMs());
        this.restClient = RestClient.builder()
                .baseUrl(properties.getUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public List<OpeningPrinciple> search(float[] queryEmbedding) {
        try {
            List<Match> matches = restClient.post()
                    .uri("/rest/v1/rpc/{fn}", properties.getMatchFunction())
                    .header("apikey", properties.getServiceKey())
                    .header("Authorization", "Bearer " + properties.getServiceKey())
                    .body(Map.of(
                            "query_embedding", queryEmbedding,
                            "match_count", properties.getMatchCount()
                    ))
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Match>>() {
                    });
            if (matches == null) {
                return List.of();
            }
            return matches.stream()
                    .map(match -> new OpeningPrinciple(match.content(), match.similarity()))
                    .toList();
        } catch (RestClientException e) {
            // Grounding is optional: the prompt builder has a "no principles" path, and the model is
            // told to fall back to the engine numbers alone. So an unreachable or unconfigured vector
            // store degrades the explanation rather than killing it — the LLM call still happens.
            // (Embedding and the chat call itself are what genuinely gate commentary; those still throw.)
            log.warn("Vector store search failed; explaining from engine output alone: {}", e.getMessage());
            return List.of();
        }
    }

    /** Bulk-inserts pre-embedded opening principles. Used only by the opt-in seeding tool. */
    public void insertPrinciples(List<SeedRow> rows) {
        try {
            restClient.post()
                    .uri("/rest/v1/opening_principles")
                    .header("apikey", properties.getServiceKey())
                    .header("Authorization", "Bearer " + properties.getServiceKey())
                    .header("Prefer", "return=minimal")
                    .body(rows)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new CommentaryUnavailableException("오프닝 원칙 데이터를 저장하는 중 오류가 발생했습니다.", e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Match(String content, double similarity) {
    }

    public record SeedRow(String content, float[] embedding, String source) {
    }
}
