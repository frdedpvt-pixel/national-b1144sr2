import Sentiment from 'sentiment';
import { config } from '../config.js';

const sentiment = new Sentiment();

/**
 * Moderate a post using simple rule-based AI
 * Returns { approved: boolean, reason: string }
 */
export function moderatePost(content) {
    // Step 1: Sentiment Analysis
    const result = sentiment.analyze(content);

    // If sentiment is significantly negative, block
    if (result.comparative < config.moderation.sentimentThreshold) {
        return {
            approved: false,
            reason: 'Negative sentiment detected'
        };
    }

    // Step 2: Toxic Keyword Detection (case-insensitive)
    const lowerContent = content.toLowerCase();
    const foundToxicWords = config.moderation.toxicKeywords.filter(keyword =>
        lowerContent.includes(keyword.toLowerCase())
    );

    if (foundToxicWords.length > 0) {
        return {
            approved: false,
            reason: 'Contains toxic language'
        };
    }

    // Post is clean
    return {
        approved: true,
        reason: null
    };
}

/**
 * Format moderation result for user feedback
 */
export function getModerationMessage(approved, reason) {
    if (approved) {
        return null;
    }

    return 'This post looks hurtful. Please be kind.';
}
