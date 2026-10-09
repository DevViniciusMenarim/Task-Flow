using TaskFlow.Application.DTOs;

namespace TaskFlow.Application.Interfaces;

public interface IUserService
{
    Task<UserResponseDTO> CreateAsync(CreateUserDTO dto);
    Task<PagedUsersDTO> SearchAsync(string? query, int page, int pageSize);
    Task<UserResponseDTO?> GetByIdAsync(Guid id);
}
