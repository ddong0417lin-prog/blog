import type { Block } from '@/contracts/types';

interface PostContentProps {
  content: Block[];
}

export function PostContent({ content }: PostContentProps) {
  if (!content || content.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        暂无内容
      </div>
    );
  }

  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      {content.map((block, index) => (
        <BlockRenderer key={block.id || index} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{block.content}</p>;

    case 'heading_1':
      return (
        <h2 id={block.id} className="scroll-mt-20">
          {block.content}
        </h2>
      );

    case 'heading_2':
      return (
        <h3 id={block.id} className="scroll-mt-20">
          {block.content}
        </h3>
      );

    case 'heading_3':
      return (
        <h4 id={block.id} className="scroll-mt-20">
          {block.content}
        </h4>
      );

    case 'code':
      return (
        <pre className="overflow-x-auto">
          <code className={`language-${(block.props?.language as string) || 'text'}`}>
            {block.content}
          </code>
        </pre>
      );

    case 'quote':
      return (
        <blockquote>
          {block.content}
        </blockquote>
      );

    case 'image': {
      const caption = block.props?.caption as string | undefined;
      return (
        <figure className="my-8">
          <img
            src={block.content}
            alt={caption || ''}
            className="w-full rounded-lg"
          />
          {caption && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'bulleted_list_item':
      return <li>{block.content}</li>;

    case 'numbered_list_item':
      return <li>{block.content}</li>;

    case 'divider':
      return <hr className="my-8" />;

    case 'callout': {
      const icon = block.props?.icon as string | undefined;
      return (
        <div className="flex gap-4 p-4 bg-muted rounded-lg my-6">
          {icon && <span className="text-2xl">{icon}</span>}
          <div>{block.content}</div>
        </div>
      );
    }

    default:
      return null;
  }
}