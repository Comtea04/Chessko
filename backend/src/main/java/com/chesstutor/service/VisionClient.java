package com.chesstutor.service;

import com.chesstutor.config.VisionProperties;
import com.chesstutor.exception.InvalidVisionImageException;
import com.chesstutor.exception.VisionThemeNotFoundException;
import com.chesstutor.exception.VisionUnavailableException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

/**
 * Forwards screenshot uploads to the Python Vision microservice (see {@code vision/README.md})
 * and translates its responses/errors into this backend's own exception vocabulary, the same
 * way {@link OpenAiClient} isolates the OpenAI HTTP contract from the rest of the app.
 */
@Component
public class VisionClient {

    private static final ObjectMapper ERROR_MAPPER = new ObjectMapper();

    private final RestClient restClient;

    public VisionClient(VisionProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) properties.getTimeoutMs());
        requestFactory.setReadTimeout((int) properties.getTimeoutMs());
        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .build();
    }

    public EnrollResult enroll(String themeId, MultipartFile image) {
        try {
            EnrollResult result = restClient.post()
                    .uri("/themes/{themeId}/enroll", themeId)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(multipartBody(image))
                    .retrieve()
                    .body(EnrollResult.class);
            if (result == null) {
                throw new VisionUnavailableException("이미지 인식 서버 응답이 비어 있습니다.");
            }
            return result;
        } catch (HttpClientErrorException.NotFound e) {
            throw new VisionThemeNotFoundException(extractMessage(e));
        } catch (HttpClientErrorException e) {
            throw new InvalidVisionImageException(extractMessage(e));
        } catch (RestClientException e) {
            throw new VisionUnavailableException("이미지 인식 서버와 통신 중 오류가 발생했습니다.", e);
        }
    }

    public ScanResult scan(String themeId, String activeColor, MultipartFile image) {
        try {
            ScanResult result = restClient.post()
                    .uri(uriBuilder -> uriBuilder.path("/scan")
                            .queryParam("theme_id", themeId)
                            .queryParam("active_color", activeColor)
                            .build())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(multipartBody(image))
                    .retrieve()
                    .body(ScanResult.class);
            if (result == null) {
                throw new VisionUnavailableException("이미지 인식 서버 응답이 비어 있습니다.");
            }
            return result;
        } catch (HttpClientErrorException.NotFound e) {
            throw new VisionThemeNotFoundException(extractMessage(e));
        } catch (HttpClientErrorException e) {
            throw new InvalidVisionImageException(extractMessage(e));
        } catch (RestClientException e) {
            throw new VisionUnavailableException("이미지 인식 서버와 통신 중 오류가 발생했습니다.", e);
        }
    }

    private MultiValueMap<String, Object> multipartBody(MultipartFile image) {
        byte[] bytes;
        try {
            bytes = image.getBytes();
        } catch (IOException e) {
            throw new InvalidVisionImageException("업로드된 이미지를 읽을 수 없습니다.", e);
        }
        String filename = image.getOriginalFilename() != null ? image.getOriginalFilename() : "screenshot.png";
        ByteArrayResource resource = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", resource);
        return body;
    }

    private String extractMessage(HttpClientErrorException e) {
        try {
            JsonNode node = ERROR_MAPPER.readTree(e.getResponseBodyAsString());
            JsonNode message = node.get("message");
            if (message != null && message.isTextual()) {
                return message.asText();
            }
        } catch (Exception ignored) {
            // fall through to the default message below
        }
        return "이미지 인식 요청이 실패했습니다.";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EnrollResult(
            @JsonProperty("theme_id") String themeId,
            @JsonProperty("squares_enrolled") int squaresEnrolled
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ScanResult(
            String fen,
            @JsonProperty("active_color") String activeColor,
            @JsonProperty("low_confidence_squares") List<String> lowConfidenceSquares
    ) {
    }
}
