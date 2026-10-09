FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Backend/ Backend/
RUN dotnet restore Backend/TaskFlow.API/TaskFlow.API.csproj --locked-mode
RUN dotnet publish Backend/TaskFlow.API/TaskFlow.API.csproj --configuration Release --no-restore --output /app/publish /p:UseAppHost=false

FROM build AS migrations
COPY .config/ .config/
RUN dotnet tool restore
CMD ["dotnet", "ef", "database", "update", "--project", "Backend/TaskFlow.Infrastructure", "--startup-project", "Backend/TaskFlow.API", "--configuration", "Release", "--no-build"]

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
ENTRYPOINT ["dotnet", "TaskFlow.API.dll"]
