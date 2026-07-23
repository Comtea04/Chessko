package com.chesstutor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * One-off admin tool that embeds {@code db/opening_principles_seed.json} with the configured
 * embedding model and loads it into the Supabase pgvector table. Disabled by default; enable with
 * {@code chessko.rag.seed-on-startup=true} (e.g. {@code CHESSKO_RAG_SEED_ON_STARTUP=true}), run
 * the app once, then turn it back off — it inserts rows unconditionally on every run and does
 * not check for existing data.
 *
 * <p>Stored and query vectors must come from the same model at the same dimension, so if the
 * embedding model or {@code embedding-dimensions} ever changes, the table has to be re-seeded —
 * a query embedded with one model can't be compared against documents embedded with another.
 */
@Component
@ConditionalOnProperty(prefix = "chessko.rag", name = "seed-on-startup", havingValue = "true")
public class OpeningPrincipleSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(OpeningPrincipleSeeder.class);

    private final OpenAiClient openAiClient;
    private final VectorStoreClient vectorStoreClient;
    private final ObjectMapper objectMapper;

    public OpeningPrincipleSeeder(OpenAiClient openAiClient, VectorStoreClient vectorStoreClient, ObjectMapper objectMapper) {
        this.openAiClient = openAiClient;
        this.vectorStoreClient = vectorStoreClient;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(String... args) throws IOException {
        List<SeedEntry> entries;
        try (var input = new ClassPathResource("db/opening_principles_seed.json").getInputStream()) {
            entries = objectMapper.readValue(input,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, SeedEntry.class));
        }

        List<VectorStoreClient.SeedRow> rows = entries.stream()
                .map(entry -> new VectorStoreClient.SeedRow(entry.content(), openAiClient.embed(entry.content()), entry.source()))
                .toList();

        vectorStoreClient.insertPrinciples(rows);
        log.info("Seeded {} opening principle(s) into the vector store", rows.size());
    }

    record SeedEntry(String content, String source) {
    }
}
