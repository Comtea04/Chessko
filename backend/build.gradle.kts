plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.chesstutor"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
    // chesslib is published through JitPack (groupId com.github.<user>), not Maven Central.
    maven { url = uri("https://jitpack.io") }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    // Move generation + UCI↔SAN conversion, so engine PVs can be shown as "O-O Nge7" rather than
    // the raw "e1g1 g8e7" the UCI protocol emits.
    implementation("com.github.bhlangonijr:chesslib:1.3.4")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
