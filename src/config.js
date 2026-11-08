export const MODES=['diffuser','no-diffuser'];
export const config=Object.freeze({
  schemaVersion:1,processingVersion:1,crops:{diffuser:.4,'no-diffuser':.25},
  clippedChannel:250,blackChannel:5,nearLimit:.05,clipLimit:.25,blackLimit:.9,minUsable:.5,
  processingHz:10,smoothingMs:1000,staleMs:1000,recoveryFrames:3,
  captureMs:2000,minFrames:10,minCaptureSpanMs:1800,maxGapMs:400,maxVariation:.1,
  minSamples:4,maxSamples:200,minLuxSpan:10,minBrightnessRatio:1.5,groupRatio:1.1,
  noiseMultiplier:3,reversalTolerance:.01,flagResidual:.2,failResidual:.3,
  goodR2:.9,minR2:.8,rangeTolerance:1e-9,maxImportBytes:1048576,historyMs:10000,maxHistory:100,
});
