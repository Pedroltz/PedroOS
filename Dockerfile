# ====================================================================
# Multi-stage Dockerfile for PedroOS 95 (.NET 10 LTS + Node.js Frontend)
# ====================================================================

# 1. Frontend Build Stage
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY scripts/ ./scripts/
COPY src/PedroOS.Web/Client/ ./src/PedroOS.Web/Client/
COPY src/PedroOS.Web/Data/ ./src/PedroOS.Web/Data/
COPY tsconfig.json ./
RUN npm run icons
RUN npm run build

# 2. .NET Build & Publish Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS dotnet-builder
WORKDIR /src
COPY PedroOS.slnx ./
COPY src/PedroOS.Web/PedroOS.Web.csproj ./src/PedroOS.Web/
COPY src/Game2091.Native/Game2091.Native.csproj ./src/Game2091.Native/
COPY tests/PedroOS.Tests/PedroOS.Tests.csproj ./tests/PedroOS.Tests/
RUN dotnet restore src/PedroOS.Web/PedroOS.Web.csproj

COPY src/PedroOS.Web/ ./src/PedroOS.Web/
COPY src/Game2091.Native/ ./src/Game2091.Native/
# Copy frontend-built assets into wwwroot
COPY --from=frontend-builder /app/src/PedroOS.Web/wwwroot/ ./src/PedroOS.Web/wwwroot/
COPY --from=frontend-builder /app/src/PedroOS.Web/Data/icons.json ./src/PedroOS.Web/Data/icons.json

WORKDIR /src/src/PedroOS.Web
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# 3. Lean Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENV Game2091__DataDirectory=/app/data
RUN mkdir -p /app/data && chown "$APP_UID:$APP_UID" /app/data

USER $APP_UID

COPY --from=dotnet-builder /app/publish ./

ENTRYPOINT ["dotnet", "PedroOS.Web.dll"]
