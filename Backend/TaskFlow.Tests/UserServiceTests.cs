using TaskFlow.Application.DTOs;
using TaskFlow.Application.Exceptions;
using TaskFlow.Application.Services;
using TaskFlow.Domain.Entities;

namespace TaskFlow.Tests;

public sealed class UserServiceTests
{
    [Fact]
    public async Task Create_rejects_duplicate_email_case_insensitively()
    {
        var users = new FakeUserRepository();
        users.Items.Add(new User("Ana", "Ana@Example.com"));

        await Assert.ThrowsAsync<ResourceConflictException>(() =>
            new UserService(users).CreateAsync(new CreateUserDTO("Outra pessoa", "ana@example.com")));

        Assert.Single(users.Items);
    }

    [Theory]
    [InlineData("invalido")]
    [InlineData(" ")]
    public async Task Create_rejects_invalid_email(string email)
    {
        await Assert.ThrowsAsync<InvalidRequestException>(() =>
            new UserService(new FakeUserRepository()).CreateAsync(new CreateUserDTO("Ana", email)));
    }

    [Fact]
    public async Task Create_rejects_name_beyond_database_limit()
    {
        await Assert.ThrowsAsync<InvalidRequestException>(() =>
            new UserService(new FakeUserRepository()).CreateAsync(
                new CreateUserDTO(new string('x', 101), "ana@example.com")));
    }

    [Fact]
    public async Task Search_filters_and_pages_users()
    {
        var users = new FakeUserRepository();
        users.Items.AddRange([
            new User("Ana", "ana@example.com"),
            new User("Bia", "bia@example.com"),
            new User("Carla", "carla@example.com")
        ]);
        var service = new UserService(users);

        var first = await service.SearchAsync(null, 1, 2);
        var second = await service.SearchAsync(null, 2, 2);
        Assert.Equal(3, first.TotalCount);
        Assert.Equal(2, first.TotalPages);
        Assert.Equal(new[] { "Ana", "Bia" }, first.Items.Select(item => item.Name));
        Assert.Equal("Carla", Assert.Single(second.Items).Name);
        Assert.Equal("Bia", Assert.Single((await service.SearchAsync("bia", 1, 20)).Items).Name);
        await Assert.ThrowsAsync<InvalidRequestException>(() => service.SearchAsync(null, 0, 20));
    }
}
