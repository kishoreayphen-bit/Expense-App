# Multi-stage Dockerfile for Java Spring Boot backend (Maven, Java 21)

# ---- Build stage ----
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy only pom.xml first to leverage Docker layer caching
COPY pom.xml ./
# Pre-fetch dependencies (ok if pom.xml not final yet)
RUN --mount=type=cache,target=/root/.m2 mvn -q -e -DskipTests dependency:go-offline || true

# Copy sources
COPY src ./src

# Build and repackage the application (skip tests in container build)
RUN --mount=type=cache,target=/root/.m2 mvn -q -e -Dmaven.test.skip=true clean package spring-boot:repackage

# ---- Run stage ----
FROM eclipse-temurin:21-jre AS run
WORKDIR /app

# JVM options (override via env)
ENV JAVA_OPTS="-Xms256m -Xmx512m"

# Copy the Spring Boot executable jar explicitly (avoid copying *.original)
COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar

# Install curl for HEALTHCHECK (image is Debian-based)
RUN apt-get update && apt-get install -y --no-install-recommends curl \ 
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8080

# Healthcheck (optional; adjust endpoint when app exists)
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD curl -fsS http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
