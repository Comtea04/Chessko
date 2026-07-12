package com.chesstutor.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.chesstutor.exception.InvalidVisionImageException;
import com.chesstutor.exception.VisionThemeNotFoundException;
import com.chesstutor.exception.VisionUnavailableException;
import com.chesstutor.service.VisionClient;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(VisionController.class)
class VisionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private VisionClient visionClient;

    private final MockMultipartFile image =
            new MockMultipartFile("image", "board.png", "image/png", new byte[] {1, 2, 3});

    @Test
    void enrollsAThemeFromAStartingPositionScreenshot() throws Exception {
        when(visionClient.enroll(anyString(), any())).thenReturn(
                new VisionClient.EnrollResult("chesscom-green", 20));

        mockMvc.perform(multipart("/api/v1/vision/themes/chesscom-green/enroll").file(image))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.themeId").value("chesscom-green"))
                .andExpect(jsonPath("$.squaresEnrolled").value(20));
    }

    @Test
    void scansAScreenshotIntoAFen() throws Exception {
        when(visionClient.scan(anyString(), anyString(), any())).thenReturn(new VisionClient.ScanResult(
                "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR", "b", List.of()));

        mockMvc.perform(multipart("/api/v1/vision/scan")
                        .file(image)
                        .param("themeId", "chesscom-green")
                        .param("activeColor", "b"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fen").value("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"))
                .andExpect(jsonPath("$.activeColor").value("b"));
    }

    @Test
    void returnsNotFoundForAnUnenrolledTheme() throws Exception {
        when(visionClient.scan(anyString(), anyString(), any()))
                .thenThrow(new VisionThemeNotFoundException("등록되지 않은 테마입니다."));

        mockMvc.perform(multipart("/api/v1/vision/scan")
                        .file(image)
                        .param("themeId", "missing")
                        .param("activeColor", "w"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void returnsBadRequestForAnUnrecognizableImage() throws Exception {
        when(visionClient.scan(anyString(), anyString(), any()))
                .thenThrow(new InvalidVisionImageException("이미지를 읽을 수 없습니다."));

        mockMvc.perform(multipart("/api/v1/vision/scan")
                        .file(image)
                        .param("themeId", "chesscom-green")
                        .param("activeColor", "w"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void surfacesVisionServiceOutagesAsServiceUnavailable() throws Exception {
        when(visionClient.enroll(anyString(), any()))
                .thenThrow(new VisionUnavailableException("이미지 인식 서버와 통신 중 오류가 발생했습니다."));

        mockMvc.perform(multipart("/api/v1/vision/themes/chesscom-green/enroll").file(image))
                .andExpect(status().isServiceUnavailable());
    }
}
