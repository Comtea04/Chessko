package com.chesstutor.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Limits on how much of the API one client may use. The API is unauthenticated — the app has no
 * accounts — so a public deployment is open to anyone who finds the domain, and two endpoints are
 * expensive enough that "anyone" is a problem: {@code /analysis/commentary} spends OpenAI credits
 * per call, and {@code /analysis/game} hands up to 200 positions to the engine pool.
 *
 * Costs are relative, drawn from one bucket per client, so a burst of cheap calls and a trickle of
 * expensive ones are measured on the same scale.
 */
@ConfigurationProperties(prefix = "chessko.rate-limit")
public class RateLimitProperties {

    /** Turn off for local development or when something in front already limits traffic. */
    private boolean enabled = true;

    /** Tokens a client may spend per minute, and the most it can save up for a burst. */
    private int tokensPerMinute = 60;

    /** Cost of an ordinary single-position analysis or a vision scan. */
    private int defaultCost = 1;

    /** LLM call — the only endpoint that spends money per request. */
    private int commentaryCost = 10;

    /** Up to 200 positions through the engine pool. */
    private int gameCost = 20;

    /**
     * Whether to read the client address from {@code X-Forwarded-For}. True is right behind Caddy
     * (see deploy/), which sets it; it must be false if the port is reachable directly, since a
     * client can otherwise pick its own identity and never hit a limit.
     */
    private boolean trustForwardedFor = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public int getTokensPerMinute() {
        return tokensPerMinute;
    }

    public void setTokensPerMinute(int tokensPerMinute) {
        this.tokensPerMinute = tokensPerMinute;
    }

    public int getDefaultCost() {
        return defaultCost;
    }

    public void setDefaultCost(int defaultCost) {
        this.defaultCost = defaultCost;
    }

    public int getCommentaryCost() {
        return commentaryCost;
    }

    public void setCommentaryCost(int commentaryCost) {
        this.commentaryCost = commentaryCost;
    }

    public int getGameCost() {
        return gameCost;
    }

    public void setGameCost(int gameCost) {
        this.gameCost = gameCost;
    }

    public boolean isTrustForwardedFor() {
        return trustForwardedFor;
    }

    public void setTrustForwardedFor(boolean trustForwardedFor) {
        this.trustForwardedFor = trustForwardedFor;
    }
}
