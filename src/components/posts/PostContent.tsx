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
  const renderHtml = (tag: 'p' | 'h2' | 'h3' | 'h4' | 'li' | 'blockquote', className?: string) => {
    const Tag = tag;
    return (
      <Tag
        className={className}
        dangerouslySetInnerHTML={{ __html: block.content }}
      />
    );
  };

  switch (block.type) {
    case 'paragraph':
      return (
        <p
          id={block.id}
          className="scroll-mt-20"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'heading_1':
      return (
        <h2
          id={block.id}
          className="scroll-mt-20"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'heading_2':
      return (
        <h3
          id={block.id}
          className="scroll-mt-20"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      );

    case 'heading_3':
      return (
        <h4
          id={block.id}
          className="scroll-mt-20"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
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
      return renderHtml('blockquote');

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
      return renderHtml('li');

    case 'numbered_list_item':
      return renderHtml('li');

    case 'divider':
      return <hr className="my-8" />;

    case 'callout': {
      const icon = block.props?.icon as string | undefined;
      return (
        <div className="flex gap-4 p-4 bg-muted rounded-lg my-6">
          {icon && <span className="text-2xl">{icon}</span>}
          <div dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
      );
    }

    default:
      return null;
  }
}
