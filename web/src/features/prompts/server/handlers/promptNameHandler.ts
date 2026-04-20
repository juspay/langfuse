import type { NextApiRequest, NextApiResponse } from "next";

import { getPromptByName } from "@/src/features/prompts/server/actions/getPromptByName";
import { deletePrompt } from "@/src/features/prompts/server/actions/deletePrompt";
import { withMiddlewares } from "@/src/features/public-api/server/withMiddlewares";
import { authorizePromptRequestOrThrow } from "../utils/authorizePromptRequest";
import {
  GetPromptByNameSchema,
  PRODUCTION_LABEL,
  UnauthorizedError,
  ForbiddenError,
} from "@langfuse/shared";
import { RateLimitService } from "@/src/features/public-api/server/RateLimitService";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { prisma } from "@langfuse/shared/src/db";

const getPromptNameHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  let authCheck: Awaited<ReturnType<typeof authorizePromptRequestOrThrow>>;
  try {
    authCheck = await authorizePromptRequestOrThrow(req);
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      res.status(200).json({
        accessDenied: true,
        message: "You are not authorized to access this project",
        prompt: null,
      });
      return;
    }
    throw error;
  }

  const rateLimitCheck = await RateLimitService.getInstance().rateLimitRequest(
    authCheck.scope,
    "prompts",
  );

  if (rateLimitCheck?.isRateLimited()) {
    return rateLimitCheck.sendRestResponseIfLimited(res);
  }

  const { promptName, version, label, resolve } = GetPromptByNameSchema.parse(
    req.query,
  );

  const prompt = await getPromptByName({
    promptName: promptName,
    projectId: authCheck.scope.projectId,
    version,
    label,
    resolve,
  });

  if (!prompt) {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    ...prompt,
    isActive: prompt.labels.includes(PRODUCTION_LABEL),
  });
};

const deletePromptNameHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
) => {
  const authCheck = await authorizePromptRequestOrThrow(req);

  const rateLimitCheck = await RateLimitService.getInstance().rateLimitRequest(
    authCheck.scope,
    "prompts",
  );

  if (rateLimitCheck?.isRateLimited()) {
    return rateLimitCheck.sendRestResponseIfLimited(res);
  }

  const { promptName, version, label } = GetPromptByNameSchema.parse(req.query);

  // Fetch prompts for audit logging
  const where = {
    projectId: authCheck.scope.projectId,
    name: promptName,
    ...(version ? { version } : {}),
    ...(label ? { labels: { has: label } } : {}),
  };

  const prompts = await prisma.prompt.findMany({ where });

  // Audit log before deletion
  for (const prompt of prompts) {
    await auditLog({
      action: "delete",
      resourceType: "prompt",
      resourceId: prompt.id,
      projectId: authCheck.scope.projectId,
      orgId: authCheck.scope.orgId,
      apiKeyId: authCheck.scope.apiKeyId,
      before: prompt,
    });
  }

  // Delete prompt versions
  await deletePrompt({
    promptName,
    projectId: authCheck.scope.projectId,
    version,
    label,
    promptVersions: prompts,
  });

  res.status(204).end();
};

export const promptNameHandler = withMiddlewares({
  GET: getPromptNameHandler,
  DELETE: deletePromptNameHandler,
});
