using TaskFlow.Domain.Entities;
using TaskFlow.Domain.Queries;

namespace TaskFlow.Domain.Interfaces;

public interface IUserRepository
{
    Task<PagedResult<User>> SearchAsync(string? query, int page, int pageSize);
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByEmailAsync(string email);
    Task AddAsync(User user);
}
