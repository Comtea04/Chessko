package com.chesstutor.domain;

/**
 * One opening theory/principle snippet retrieved from the Supabase pgvector store.
 *
 * @param content    the principle text (Korean or English) used as LLM grounding context
 * @param similarity cosine similarity to the search query, 1.0 = identical
 */
public record OpeningPrinciple(String content, double similarity) {
}
