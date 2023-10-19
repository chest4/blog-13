import Link from "next/link";

const Header = () => {
	return (
		<header className="container max-w-3xl mx-auto px-4 py-2">
			<ul className="flex justify-center gap-5">
				<li>
					<Link href="/">Main page</Link>
				</li>
				<li>
					<Link href="/posts">Blog page</Link>
				</li>
			</ul>
		</header>
	);
}

export default Header;