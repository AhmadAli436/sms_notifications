import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!image || image.size === 0) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Validate image type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid image file type' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for MMS)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    // Upload to ImgBB (free image hosting)
    const imgbbApiKey = process.env.IMGBB_API_KEY || 'ff8467372df2f6f3f3dc65c31041bf8a';
    
    try {
      const imgbbFormData = new URLSearchParams();
      imgbbFormData.append('key', imgbbApiKey);
      imgbbFormData.append('image', base64);

      const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: imgbbFormData.toString(),
      });

      if (imgbbResponse.ok) {
        const imgbbData = await imgbbResponse.json();
        
        if (imgbbData.success && imgbbData.data) {
          // ImgBB API returns:
          // - data.url: Direct image URL (https://i.ibb.co/...)
          // - data.image.url: Also direct image URL
          // - data.url_viewer: Page URL (not what we need)
          // Use data.url or data.image.url (both are direct image URLs)
          const imageUrl = imgbbData.data.image?.url || imgbbData.data.url;
          
          if (imageUrl) {
            // Ensure HTTPS (Twilio requires HTTPS for media URLs)
            const directImageUrl = imageUrl.startsWith('http://') 
              ? imageUrl.replace('http://', 'https://')
              : imageUrl;
            
            console.log('ImgBB upload successful. Image URL:', directImageUrl);
            
            return NextResponse.json({
              success: true,
              url: directImageUrl,
              filename: image.name,
            });
          }
        }
        
        console.error('ImgBB upload failed - no URL in response:', imgbbData);
        return NextResponse.json(
          { error: 'ImgBB upload failed', details: imgbbData.error?.message || 'No image URL in response' },
          { status: 500 }
        );
      } else {
        const errorData = await imgbbResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('ImgBB API Error:', errorData);
        return NextResponse.json(
          { error: 'Failed to upload to ImgBB', details: errorData.error?.message || 'Upload failed' },
          { status: imgbbResponse.status }
        );
      }
    } catch (error) {
      console.error('ImgBB upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image to ImgBB', details: error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error.message },
      { status: 500 }
    );
  }
}
