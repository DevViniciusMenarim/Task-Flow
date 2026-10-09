using Microsoft.Data.SqlClient;

namespace TaskFlow.IntegrationTests;

internal sealed class IntegrationDatabase : IAsyncDisposable
{
    private readonly string _adminConnectionString;
    private readonly string _databaseName;

    private IntegrationDatabase(string adminConnectionString, string connectionString,
        string databaseName)
    {
        _adminConnectionString = adminConnectionString;
        ConnectionString = connectionString;
        _databaseName = databaseName;
    }

    public string ConnectionString { get; }

    public static async Task<IntegrationDatabase> CreateAsync(bool caseSensitive = false)
    {
        var source = Environment.GetEnvironmentVariable("TASKFLOW_TEST_SQL_CONNECTION");
        if (string.IsNullOrWhiteSpace(source))
            throw new InvalidOperationException(
                "Configure TASKFLOW_TEST_SQL_CONNECTION com uma conexão de teste que possa criar bancos.");

        var adminOptions = new SqlConnectionStringBuilder(source) { InitialCatalog = "master" };
        var name = "TaskFlowIntegration_" + Guid.NewGuid().ToString("N");
        var databaseOptions = new SqlConnectionStringBuilder(source) { InitialCatalog = name };

        await using var admin = new SqlConnection(adminOptions.ConnectionString);
        Exception? lastConnectionError = null;
        for (var attempt = 0; attempt < 45; attempt++)
        {
            try
            {
                await admin.OpenAsync();
                lastConnectionError = null;
                break;
            }
            catch (SqlException error)
            {
                lastConnectionError = error;
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }
        if (lastConnectionError is not null)
            throw new InvalidOperationException("SQL Server de teste não ficou pronto em 90 segundos.",
                lastConnectionError);

        await using var command = admin.CreateCommand();
        command.CommandText = $"CREATE DATABASE [{name}]";
        await command.ExecuteNonQueryAsync();
        if (caseSensitive)
        {
            command.CommandText = $"ALTER DATABASE [{name}] COLLATE Latin1_General_100_CS_AS";
            await command.ExecuteNonQueryAsync();
        }
        return new IntegrationDatabase(adminOptions.ConnectionString,
            databaseOptions.ConnectionString, name);
    }

    public async ValueTask DisposeAsync()
    {
        SqlConnection.ClearAllPools();
        await using var admin = new SqlConnection(_adminConnectionString);
        await admin.OpenAsync();
        await using var command = admin.CreateCommand();
        command.CommandText = $"ALTER DATABASE [{_databaseName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE";
        await command.ExecuteNonQueryAsync();
        command.CommandText = $"DROP DATABASE [{_databaseName}]";
        await command.ExecuteNonQueryAsync();
    }
}
