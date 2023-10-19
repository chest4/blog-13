import Link from "next/link";
import { PostMetadata } from "./PostMetadata";

const PostPreview = (props: PostMetadata) => {
	return <>
		<li className="flex flex-col mb-10 p-5 bg-slate-200 rounded-xl">
			<Link className=" flex-1" href={`/posts/${props.slug}`}>
				<h2 className="text-2xl mb-5">{props.title}</h2>
			</Link>
			<p className="mb-4 text-slate-400">{props.date}</p>
			<p className="italic text-slate-600">{props.excerpt}</p>
		</li>
	</>
};

export default PostPreview;