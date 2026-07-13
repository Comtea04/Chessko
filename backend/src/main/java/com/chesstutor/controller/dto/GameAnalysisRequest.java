package com.chesstutor.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Every position of a game, in order. The cap keeps a single review from monopolising the engine
 * pool; long games are truncated by the client rather than silently dropped here.
 */
public record GameAnalysisRequest(
        @NotEmpty(message = "분석할 포지션이 없습니다.")
        @Size(max = 200, message = "한 번에 분석할 수 있는 포지션은 200개까지입니다.")
        List<@NotBlank(message = "FEN 값은 필수입니다.") String> fens
) {
}
