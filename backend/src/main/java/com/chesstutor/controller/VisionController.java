package com.chesstutor.controller;

import com.chesstutor.controller.dto.VisionEnrollResponse;
import com.chesstutor.controller.dto.VisionScanResponse;
import com.chesstutor.service.VisionClient;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/vision")
public class VisionController {

    private final VisionClient visionClient;

    public VisionController(VisionClient visionClient) {
        this.visionClient = visionClient;
    }

    @PostMapping(value = "/themes/{themeId}/enroll", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public VisionEnrollResponse enroll(@PathVariable String themeId, @RequestParam MultipartFile image) {
        return VisionEnrollResponse.from(visionClient.enroll(themeId, image));
    }

    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public VisionScanResponse scan(
            @RequestParam String themeId,
            @RequestParam(defaultValue = "w") String activeColor,
            @RequestParam MultipartFile image
    ) {
        return VisionScanResponse.from(visionClient.scan(themeId, activeColor, image));
    }
}
