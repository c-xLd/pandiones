import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { adminForbiddenResponse } from '@/lib/admin/product-editor-http';
import {
  getCategoriesTree,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '@/lib/categories';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const flat = searchParams.get('flat') === 'true';

    if (flat) {
      const categories = await getAllCategories(true);
      return NextResponse.json({ categories });
    }

    const categories = await getCategoriesTree(true);
    const all = await getAllCategories(true);
    return NextResponse.json({ categories, all });
  } catch (error) {
    console.error('Admin categories fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kategoriler alınamadı.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Kategori adı zorunludur.' }, { status: 400 });
    }

    const category = await createCategory({
      name: body.name,
      slug: body.slug,
      description: body.description,
      parentId: body.parentId || null,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
      image: body.image,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Admin category create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kategori oluşturulamadı.' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const body = await request.json();

    // Check if reordering
    if (Array.isArray(body.orderedIds)) {
      await reorderCategories(body.orderedIds);
      return NextResponse.json({ success: true });
    }

    if (!body.id) {
      return NextResponse.json({ error: 'Kategori ID zorunludur.' }, { status: 400 });
    }

    const category = await updateCategory(body.id, {
      name: body.name,
      slug: body.slug,
      description: body.description,
      parentId: body.parentId,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
      image: body.image,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error('Admin category update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kategori güncellenemedi.' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCurrentUser();
    if (!session || session.role !== 'ADMIN') {
      return adminForbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Kategori ID zorunludur.' }, { status: 400 });
    }

    const result = await deleteCategory(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Kategori silinemedi.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin category delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kategori silinemedi.' },
      { status: 500 }
    );
  }
}
