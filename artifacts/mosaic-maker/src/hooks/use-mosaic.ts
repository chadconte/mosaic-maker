import { useGenerateMosaic, getDownloadFileUrl } from "@workspace/api-client-react";

export function useMosaicGenerator() {
  return useGenerateMosaic();
}

export function getSectionUrl(sessionId: string, filename: string) {
  return getDownloadFileUrl(sessionId, filename);
}
