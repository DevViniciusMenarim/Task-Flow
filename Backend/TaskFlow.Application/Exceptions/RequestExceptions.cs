namespace TaskFlow.Application.Exceptions;

public sealed class InvalidRequestException(string message) : Exception(message);

public sealed class ResourceNotFoundException(string message) : Exception(message);

public sealed class ResourceConflictException(string message) : Exception(message);
