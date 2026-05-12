#[cfg(target_os = "windows")]
mod win {
    use std::ffi::c_void;
    use std::ptr;
    use windows_sys::Win32::System::Memory::{
        OpenFileMappingW, MapViewOfFile, UnmapViewOfFile, FILE_MAP_READ,
    };
    use windows_sys::Win32::Foundation::CloseHandle;

    pub struct SharedMemory {
        handle: *mut c_void,
        view:   *const u8,
        size:   usize,
    }

    unsafe impl Send for SharedMemory {}
    unsafe impl Sync for SharedMemory {}

    impl SharedMemory {
        pub fn open(name: &str, size: usize) -> Option<Self> {
            let wide: Vec<u16> = name.encode_utf16().chain([0]).collect();
            let handle = unsafe { OpenFileMappingW(FILE_MAP_READ, 0, wide.as_ptr()) };
            if handle.is_null() { return None; }
            let view = unsafe { MapViewOfFile(handle, FILE_MAP_READ, 0, 0, size) };
            if view.Value.is_null() {
                unsafe { CloseHandle(handle); }
                return None;
            }
            Some(Self { handle, view: view.Value as *const u8, size })
        }

        pub fn read_i32(&self, offset: usize) -> i32 {
            if offset + 4 > self.size { return 0; }
            let mut buf = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(offset), buf.as_mut_ptr(), 4); }
            i32::from_le_bytes(buf)
        }

        pub fn read_f32(&self, offset: usize) -> f32 {
            if offset + 4 > self.size { return 0.0; }
            let mut buf = [0u8; 4];
            unsafe { ptr::copy_nonoverlapping(self.view.add(offset), buf.as_mut_ptr(), 4); }
            f32::from_le_bytes(buf)
        }

        pub fn read_utf16(&self, offset: usize, max_chars: usize) -> String {
            if offset + max_chars * 2 > self.size { return String::new(); }
            let mut chars: Vec<u16> = Vec::with_capacity(max_chars);
            for i in 0..max_chars {
                let mut buf = [0u8; 2];
                unsafe {
                    ptr::copy_nonoverlapping(
                        self.view.add(offset + i * 2), buf.as_mut_ptr(), 2
                    );
                }
                let c = u16::from_le_bytes(buf);
                if c == 0 { break; }
                chars.push(c);
            }
            String::from_utf16_lossy(&chars).to_string()
        }
    }

    impl Drop for SharedMemory {
        fn drop(&mut self) {
            unsafe {
                use windows_sys::Win32::System::Memory::MEMORY_MAPPED_VIEW_ADDRESS;
                let addr = MEMORY_MAPPED_VIEW_ADDRESS { Value: self.view as *mut _ };
                UnmapViewOfFile(addr);
                CloseHandle(self.handle);
            }
        }
    }
}
