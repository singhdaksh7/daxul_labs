import CollectionEditor from "@/components/admin/catalog/CollectionEditor";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CollectionEditor collectionId={id} />;
}
