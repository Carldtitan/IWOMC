//! Cooperative graceful-shutdown signalling.

use std::{
    sync::{Arc, Condvar, Mutex},
    time::Duration,
};

#[derive(Clone, Debug)]
pub struct ShutdownToken {
    state: Arc<(Mutex<bool>, Condvar)>,
}

impl Default for ShutdownToken {
    fn default() -> Self {
        Self {
            state: Arc::new((Mutex::new(false), Condvar::new())),
        }
    }
}

impl ShutdownToken {
    pub fn request(&self) {
        let (lock, signal) = &*self.state;
        let mut requested = lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *requested = true;
        signal.notify_all();
    }

    #[must_use]
    pub fn is_requested(&self) -> bool {
        let (lock, _) = &*self.state;
        *lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    /// Returns `true` when shutdown was requested before the timeout elapsed.
    #[must_use]
    pub fn wait_timeout(&self, timeout: Duration) -> bool {
        let (lock, signal) = &*self.state;
        let requested = lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if *requested {
            return true;
        }
        let (requested, _) = signal
            .wait_timeout_while(requested, timeout, |value| !*value)
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *requested
    }
}

#[cfg(test)]
mod tests {
    use std::{thread, time::Duration};

    use super::ShutdownToken;

    #[test]
    fn cloned_token_wakes_waiters() {
        let token = ShutdownToken::default();
        let requester = token.clone();
        let handle = thread::spawn(move || {
            thread::sleep(Duration::from_millis(10));
            requester.request();
        });

        assert!(token.wait_timeout(Duration::from_secs(1)));
        handle.join().expect("request thread must finish");
        assert!(token.is_requested());
    }
}
