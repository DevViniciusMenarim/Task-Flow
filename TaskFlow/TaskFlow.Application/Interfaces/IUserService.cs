using TaskFlow.Application.DTOs;

namespace TaskFlow.Application.Interfaces;

public interface IUserService
{
    Task<UserResponseDTO> CreateAsync(CreateUserDTO dto);
    Task<IEnumerable<UserResponseDTO>> GetAllAsync();
    Task<UserResponseDTO?> GetByIdAsync(Guid id);
}