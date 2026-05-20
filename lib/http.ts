export function jsonError(error: unknown) {
  if (error instanceof Response) {
    const message =
      error.status === 401
        ? "请先登录"
        : error.status === 403
          ? "没有权限"
          : error.statusText || "请求失败";

    return Response.json({ error: message }, { status: error.status });
  }

  console.error(error);

  const message =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : "服务器暂时无法处理请求";

  return Response.json({ error: message }, { status: 500 });
}
