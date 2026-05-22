package com.example.demo.exception;

import com.example.demo.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.TransactionSystemException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler{
    private String rootCauseMessage(Throwable ex) {
        Throwable cursor = ex;
        while (cursor.getCause() != null && cursor.getCause() != cursor) {
            cursor = cursor.getCause();
        }
        String msg = cursor.getMessage();
        return (msg == null || msg.isBlank()) ? cursor.toString() : msg;
    }

    @ExceptionHandler(EmailAlreadyExistException.class)
    public ResponseEntity<ApiResponse<Object>> handleEmailExists(EmailAlreadyExistException ex){
        return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<ApiResponse<Object>> handleInvalidPassword(InvalidPasswordException ex){
        return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.UNAUTHORIZED);
    }
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleUserNotFound(UserNotFoundException ex){
        return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.NOT_FOUND);
    }
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFound(ResourceNotFoundException ex){
        return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.NOT_FOUND);
    }
    @ExceptionHandler({BadRequestException.class, IllegalArgumentException.class})
    public ResponseEntity<ApiResponse<Object>> handleBadRequest(RuntimeException ex){
        return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.BAD_REQUEST);
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Object>> handleNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Request body not readable: {}", ex.getMessage());
        return new ResponseEntity<>(
                ApiResponse.error("Dữ liệu gửi lên không đúng định dạng. Vui lòng kiểm tra lại."),
                HttpStatus.BAD_REQUEST
        );
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        // Common cases: unique constraint violation (orderCode), FK issues, etc.
        log.error("Data integrity violation", ex);
        return new ResponseEntity<>(
                ApiResponse.error("Dữ liệu không hợp lệ hoặc bị trùng. Vui lòng thử lại."),
                HttpStatus.CONFLICT
        );
    }
    @ExceptionHandler(TransactionSystemException.class)
    public ResponseEntity<ApiResponse<Object>> handleTransaction(TransactionSystemException ex) {
        // Typical wrapper for RollbackException/ConstraintViolationException.
        log.error("Transaction commit failed", ex);
        String debugMessage = ex.getClass().getSimpleName()
                + ": " + (ex.getMessage() == null ? "" : ex.getMessage())
                + " | root: " + rootCauseMessage(ex);
        return new ResponseEntity<>(ApiResponse.error(debugMessage), HttpStatus.INTERNAL_SERVER_ERROR);
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleAll(Exception ex){
        log.error("Unhandled exception", ex);
        String message = (ex.getMessage() == null || ex.getMessage().isBlank())
                ? rootCauseMessage(ex)
                : ex.getMessage();
        String root = rootCauseMessage(ex);
        String debugMessage = ex.getClass().getSimpleName() + ": " + message;
        if (root != null && !root.isBlank() && !root.equals(message)) {
            debugMessage = debugMessage + " | root: " + root;
        }
        return new ResponseEntity<>(ApiResponse.error(debugMessage), HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
