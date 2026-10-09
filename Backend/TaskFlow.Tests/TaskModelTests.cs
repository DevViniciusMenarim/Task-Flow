using Microsoft.EntityFrameworkCore;
using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Enums;
using TaskFlow.Infrastructure.Context;

namespace TaskFlow.Tests;

public sealed class TaskModelTests
{
    [Fact]
    public void Low_priority_is_not_the_sentinel_for_database_default()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=Unused;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var context = new AppDbContext(options);
        var priority = context.Model.FindEntityType(typeof(TaskItem))!
            .FindProperty(nameof(TaskItem.Priority))!;

        Assert.Equal(TaskPriority.Normal, priority.GetDefaultValue());
        Assert.Equal((TaskPriority)(-1), priority.Sentinel);
        Assert.NotEqual(TaskPriority.Low, priority.Sentinel);
    }
}
