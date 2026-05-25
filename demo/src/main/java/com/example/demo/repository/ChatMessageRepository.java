package com.example.demo.repository;

import com.example.demo.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByOrderIdAndChannelOrderByCreatedAtAsc(Long orderId, String channel);
    List<ChatMessage> findByOrderIdAndChannelAndIsReadFalse(Long orderId, String channel);
    long countByOrderIdAndIsReadFalseAndSenderIdNot(Long orderId, Long senderId);
    long countByOrderIdAndChannelAndIsReadFalseAndSenderIdNot(Long orderId, String channel, Long senderId);
}
