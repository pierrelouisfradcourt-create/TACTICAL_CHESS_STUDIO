use std::collections::VecDeque;

use crate::engine::event::event::Event;

pub struct EventQueue {
    queue: VecDeque<Event>,
}

impl EventQueue {
    pub fn new() -> Self {
        Self {
            queue: VecDeque::new(),
        }
    }

    pub fn push(&mut self, event: Event) {
        self.queue.push_back(event);
    }

    pub fn pop(&mut self) -> Option<Event> {
        self.queue.pop_front()
    }
}
