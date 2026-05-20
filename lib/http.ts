export function jsonError(error: unknown) {
  if (error instanceof Response) {
    return Response.json({ error: error.statusText || "Request failed" }, { status: error.status });
  }

  console.error(error);
  return Response.json({ error: "服务器暂时无法处理请求" }, { status: 500 });
}
