/**
 * Akool API Integration
 *
 * Image-to-video animation using Akool's AI.
 */

export {
  AkoolClient,
  getAkoolClient,
  animateImages,
  AKOOL_STATUS,
  AKOOL_CREDIT_COSTS,
} from './client';

export type {
  AkoolImage2VideoRequest,
  AkoolImage2VideoResponse,
  AkoolTaskStatus,
  AnimationResult,
} from './client';
