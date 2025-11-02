import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const jobSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  skills: z.array(z.string()).optional(),
  visibility: z.enum(['public', 'private']).default('private'),
});

// GET - Fetch a single job by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid job ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const job = await db.collection('jobs').findOne({ _id: new ObjectId(id) });

    if (!job) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch job:', error);
    return NextResponse.json({ 
      message: 'An internal server error occurred' 
    }, { status: 500 });
  }
}

// PUT - Update a job
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid job ID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = jobSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        message: 'Invalid input', 
        errors: validation.error.errors 
      }, { status: 400 });
    }

    const { title, description, skills, visibility } = validation.data;
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json({ message: 'User email is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user || user.role !== 'company') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Check if job exists and belongs to user
    const existingJob = await db.collection('jobs').findOne({ 
      _id: new ObjectId(id),
      createdBy: user._id 
    });

    if (!existingJob) {
      return NextResponse.json({ message: 'Job not found or unauthorized' }, { status: 404 });
    }

    // Update job
    const result = await db.collection('jobs').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          title,
          description,
          skills: skills || [],
          visibility: visibility || 'private',
          updatedAt: new Date(),
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Job updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to update job:', error);
    return NextResponse.json({ 
      message: 'An internal server error occurred' 
    }, { status: 500 });
  }
}

// DELETE - Delete a job
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid job ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json({ message: 'User email is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user
    const user = await db.collection('users').findOne({ email: userEmail });
    if (!user || user.role !== 'company') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    // Check if job exists and belongs to user
    const existingJob = await db.collection('jobs').findOne({ 
      _id: new ObjectId(id),
      createdBy: user._id 
    });

    if (!existingJob) {
      return NextResponse.json({ message: 'Job not found or unauthorized' }, { status: 404 });
    }

    // Delete job
    const result = await db.collection('jobs').deleteOne({ 
      _id: new ObjectId(id),
      createdBy: user._id 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ message: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Job deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to delete job:', error);
    return NextResponse.json({ 
      message: 'An internal server error occurred' 
    }, { status: 500 });
  }
}
