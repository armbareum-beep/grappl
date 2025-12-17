# Video Processing Backend Integration

## Lesson vs Drill Identification

The frontend sends video processing requests with a `drillId` parameter. To distinguish between lessons and drills:

### Drill Processing
- `drillId`: Regular UUID (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
- Backend should update the `drills` table with the processed video URL

### Lesson Processing  
- `drillId`: Prefixed with `LESSON-` (e.g., `"LESSON-550e8400-e29b-41d4-a716-446655440000"`)
- Backend should:
  1. Extract the actual lesson ID by removing the `LESSON-` prefix
  2. Update the `lessons` table instead of `drills` table
  3. Use the same video processing pipeline

### Backend Implementation Required

```typescript
// In your backend /process endpoint:
function processVideoRequest(req, res) {
  const { drillId, videoId, filename, cuts, title, description, videoType } = req.body;
  
  // Check if this is a lesson
  const isLesson = drillId.startsWith('LESSON-');
  const actualId = isLesson ? drillId.replace('LESSON-', '') : drillId;
  const tableName = isLesson ? 'lessons' : 'drills';
  
  // Process video...
  // Then update the correct table:
  if (isLesson) {
    // Update lessons table
    await supabase
      .from('lessons')
      .update({ vimeoUrl: processedVideoUrl })
      .eq('id', actualId);
  } else {
    // Update drills table
    await supabase
      .from('drills')
      .update({ vimeoUrl: processedVideoUrl })
      .eq('id', actualId);
  }
}
```

### Why This Approach?

1. **Backward Compatibility**: Existing drill uploads continue to work without changes
2. **Clear Separation**: The `LESSON-` prefix makes it obvious what type of content is being processed
3. **Single Pipeline**: Both lessons and drills use the same video processing infrastructure
4. **Future-Proof**: Easy to add more content types (e.g., `COURSE-`, `TUTORIAL-`) later

### Testing

To test lesson uploads:
1. Create a lesson through the UI
2. Check the backend logs for `drillId` starting with `LESSON-`
3. Verify the `lessons` table is updated, not the `drills` table
