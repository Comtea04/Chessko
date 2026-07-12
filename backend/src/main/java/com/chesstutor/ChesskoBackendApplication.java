package com.chesstutor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ChesskoBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChesskoBackendApplication.class, args);
    }
}
