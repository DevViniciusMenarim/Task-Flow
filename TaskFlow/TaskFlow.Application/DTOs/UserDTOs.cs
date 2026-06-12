namespace TaskFlow.Application.DTOs;

public record CreateUserDTO(string Name, string Email);
public record UserResponseDTO(Guid Id, string Name, string Email);