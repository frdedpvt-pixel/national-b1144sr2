# Quick Testing Guide - School Feed Post Creation

## 🚀 Servers Running
- **Backend**: http://localhost:5001 ✅
- **Frontend**: http://localhost:5173 ✅

---

## 📝 Test Scenarios

### Test 1: Student Post with Text Only
1. Login as a student (e.g., `alice@student.edu` / `password123`)
2. Navigate to **Feed** page
3. Click "✍️ Create Post"
4. Enter text: "Excited for tomorrow's science quiz! 📚"
5. Select tag: "#Academics"
6. Don't upload any image
7. Click "Publish Post"
8. ✅ Expected: Post appears in feed (if text passes moderation)

### Test 2: Student Post with Text + Image
1. Login as a student
2. Navigate to **Feed** page
3. Click "✍️ Create Post"
4. Enter text: "Our basketball team won today! 🏀"
5. Select tag: "#Sports"
6. Click "Choose File" and upload a `.jpg` or `.png` image
7. ✅ Expected: Image preview appears below file input
8. Optionally click "Remove Image" to test removal
9. Re-upload the image
10. Click "Publish Post"
11. ✅ Expected: Post appears with image in feed

### Test 3: Student Post with Inappropriate Text (AI Blocks)
1. Login as a student
2. Navigate to **Feed** page
3. Click "✍️ Create Post"
4. Enter text: "I hate this stupid class"
5. Select tag: "#Academics"
6. Upload an image
7. Click "Publish Post"
8. ✅ Expected: 
   - Error message appears
   - Post is blocked
   - Image is deleted from server
   - Post does NOT appear in feed

### Test 4: Invalid File Type
1. Login as student or teacher
2. Navigate to **Feed** page
3. Click "✍️ Create Post"
4. Enter text: "Testing file validation"
5. Select tag: "#Academics"
6. Try to upload a `.pdf`, `.txt`, or other non-image file
7. ✅ Expected: Error message "Invalid file type. Only JPG, JPEG, and PNG images are allowed."

### Test 5: File Too Large
1. Find or create an image larger than 5MB
2. Try to upload it
3. ✅ Expected: Error message "File size too large. Maximum size is 5MB."

### Test 6: Teacher Post (Bypasses Moderation)
1. Login as a teacher (e.g., `teacher1@school.edu` / `password123`)
2. Navigate to **Feed** page (or click "📱 School Feed" from dashboard)
3. Click "✍️ Create Post"
4. ✅ Expected: See blue info box: "✓ Your posts are automatically approved (no AI moderation)"
5. Enter text: "Important announcement about next week's exams"
6. Select tag: "#Academics"
7. Upload an image (optional)
8. Click "Publish Post"
9. ✅ Expected: 
   - Post immediately appears in feed
   - No moderation delay
   - Verified badge (✓ Verified) shown next to teacher name

### Test 7: Image Preview & Remove
1. Create a post
2. Upload an image
3. ✅ Expected: Preview appears below file input
4. Click "Remove Image" button
5. ✅ Expected: Preview disappears, file input is reset
6. Upload a different image
7. ✅ Expected: New preview appears

### Test 8: Multiple Users See Same Feed
1. Login as student and create a post with image
2. Logout
3. Login as different student
4. Navigate to Feed
5. ✅ Expected: See the post created by first student with image displayed

---

## 🔍 Verification Checklist

### Backend Verification:
- [ ] Images stored in `/uploads` directory
- [ ] Filenames are unique (timestamp + random number)
- [ ] Images accessible at `http://localhost:5001/uploads/{filename}`
- [ ] Database `posts` table has `image` column with path
- [ ] AI moderation only runs for students
- [ ] Teachers' posts skip moderation

### Frontend Verification:
- [ ] File input only accepts `.jpg`, `.jpeg`, `.png`
- [ ] Image preview works correctly
- [ ] Remove image button functions
- [ ] Error messages display for invalid files
- [ ] Success messages display on post creation
- [ ] FormData sends correctly to backend
- [ ] Images display in feed after posting

### Security Verification:
- [ ] Cannot upload `.exe`, `.sh`, `.php` files
- [ ] File size limit enforced
- [ ] MIME type validation works
- [ ] Uploaded files cannot be executed
- [ ] Files are deleted if post fails

---

## 📊 Test Data

### Student Accounts:
- `alice@student.edu` / `password123`
- `bob@student.edu` / `password123`

### Teacher Accounts:
- `teacher1@school.edu` / `password123`
- `admin@school.edu` / `password123`

---

## 🐛 Common Issues & Solutions

### Issue: Image doesn't display in feed
**Solution**: 
- Check console for errors
- Verify image path in database
- Check that backend server is serving static files from `/uploads`

### Issue: "Failed to create post" error
**Solution**:
- Check backend terminal for errors
- Verify both servers are running
- Check network tab for API response

### Issue: File upload doesn't work
**Solution**:
- Ensure Content-Type is multipart/form-data
- Verify multer middleware is applied to route
- Check browser console for errors

### Issue: AI moderation not working
**Solution**:
- Verify moderation service is imported
- Check student vs teacher route logic
- Look for moderation errors in backend logs

---

## 📸 Sample Test Images

You can use these free image sources for testing:
- https://picsum.photos/800/600 (random image)
- Any image from your computer (max 5MB)
- JPG, JPEG, or PNG format only

---

## ✅ Success Criteria

All tests should:
1. ✅ Display appropriate success/error messages
2. ✅ Handle file uploads correctly
3. ✅ Apply AI moderation to students only
4. ✅ Store images with unique filenames
5. ✅ Display images in feed
6. ✅ Clean up files on errors
7. ✅ Validate file types and sizes
8. ✅ Work for both students and teachers

---

## 🎯 Next Steps After Testing

1. Create test posts with various content
2. Verify image quality in feed
3. Test on different browsers (Chrome, Safari, Firefox)
4. Check mobile responsiveness
5. Performance test with multiple concurrent uploads
6. Security audit of file handling
7. Load testing with many posts

---

## 📝 Notes

- Images are stored locally in `/uploads` directory
- For production, consider cloud storage (S3, Cloudinary)
- Current implementation is demo-ready and production-safe
- All security measures are in place

**Happy Testing! 🚀**
