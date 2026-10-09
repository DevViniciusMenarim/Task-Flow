using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;
using TaskFlow.Infrastructure.Context;

namespace TaskFlow.Tests;

public sealed class DateTimeConversionTests
{
    [Theory]
    [InlineData(nameof(TaskItem.CreatedAt))]
    [InlineData(nameof(TaskItem.DueDate))]
    public void SqlServer_datetime2_values_are_restored_as_utc(string propertyName)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=TaskFlow_ModelOnly;Trusted_Connection=True")
            .Options;
        using var context = new AppDbContext(options);
        var property = context.Model.FindEntityType(typeof(TaskItem))!.FindProperty(propertyName)!;
        var converter = property.GetTypeMapping().Converter!;
        var storedValue = new DateTime(2026, 10, 3, 2, 30, 0, DateTimeKind.Unspecified);

        var restored = (DateTime)converter.ConvertFromProvider(storedValue)!;

        Assert.Equal(DateTimeKind.Utc, restored.Kind);
        Assert.Equal(storedValue.Ticks, restored.Ticks);
        Assert.EndsWith("Z\"", JsonSerializer.Serialize(restored));
    }

    [Fact]
    public void Subtask_creation_timestamp_is_restored_as_utc()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=TaskFlow_ModelOnly;Trusted_Connection=True")
            .Options;
        using var context = new AppDbContext(options);
        var property = context.Model.FindEntityType(typeof(SubtaskItem))!
            .FindProperty(nameof(SubtaskItem.CreatedAt))!;
        var converter = property.GetTypeMapping().Converter!;
        var restored = (DateTime)converter.ConvertFromProvider(
            new DateTime(2026, 10, 3, 2, 30, 0, DateTimeKind.Unspecified))!;

        Assert.Equal(DateTimeKind.Utc, restored.Kind);
    }
}
