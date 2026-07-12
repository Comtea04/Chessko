package com.chesstutor.domain;

import java.util.List;

/**
 * The generated natural-language explanation for a position, plus the opening principles that
 * grounded it (kept around for debugging/UI attribution, not exposed to the LLM again).
 */
public record Commentary(String text, List<OpeningPrinciple> references) {

    public static Commentary of(String text, List<OpeningPrinciple> references) {
        return new Commentary(text, references);
    }

    public static Commentary withoutReferences(String text) {
        return new Commentary(text, List.of());
    }
}
