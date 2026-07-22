# ---- build stage: produce the Spring Boot executable jar ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

# Warm the dependency/plugin cache on its own layer so source edits don't refetch everything.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies || true

COPY src ./src
# bootJar (not build) so tests don't run in the image build. Spring Boot also emits a
# *-plain.jar; grep it out and keep only the executable one.
RUN ./gradlew --no-daemon clean bootJar \
    && cp "$(ls build/libs/*.jar | grep -v -- '-plain')" /app.jar

# ---- runtime stage: JRE + Stockfish ----
FROM eclipse-temurin:21-jre
# curl is here for the compose healthcheck against /health, not for the app itself.
RUN apt-get update && apt-get install -y --no-install-recommends \
        stockfish \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app.jar app.jar

# Debian/Ubuntu install Stockfish here; overridable via compose.
ENV STOCKFISH_PATH=/usr/games/stockfish

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
