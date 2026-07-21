import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'required_feature';
export const RequiresFeature = (featureKey: string) =>
  SetMetadata(FEATURE_KEY, featureKey);
