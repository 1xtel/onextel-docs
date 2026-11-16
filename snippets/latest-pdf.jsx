// Starts the download of the newest docs PDF. Each release on GitHub carries one
// OneXtel_Documentation_<version>.pdf, and the latest release is always the newest version.
export const LatestPdf = () => {
  const releases = "https://github.com/1xtel/onextel-docs/releases";
  const [pdf, setPdf] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("https://api.github.com/repos/1xtel/onextel-docs/releases/latest")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`GitHub returned ${r.status}`))))
      .then((release) => {
        const assets = release.assets || [];
        const asset = assets.find((a) => /^OneXtel_Documentation_.+\.pdf$/.test(a.name)) || assets.find((a) => a.name.endsWith(".pdf"));
        if (!asset) throw new Error("No PDF in the latest release");
        setPdf({ url: asset.browser_download_url, name: asset.name });
        window.location.assign(asset.browser_download_url);
      })
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return <p>The download did not start. Get the PDF from the <a href={`${releases}/latest`}>latest release</a>.</p>;
  }
  if (!pdf) return <p>Finding the latest version…</p>;
  return (
    <p>
      Downloading <strong>{pdf.name}</strong>. If it does not start, <a href={pdf.url}>download it here</a>.
      Earlier versions are on the <a href={releases}>releases page</a>.
    </p>
  );
};
